import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));

class MockQueryBuilder {
  private table: string;
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private insertPayload: unknown = null;
  private updatePayload: Record<string, unknown> | null = null;
  private filters: Array<(item: Record<string, unknown>) => boolean> = [];
  private orderConfig: { column: string; ascending: boolean } | null = null;
  private isSingle = false;
  private isMaybeSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  select(_columns?: string) {
    void _columns;
    if (this.op !== 'insert' && this.op !== 'update') {
      this.op = 'select';
    }
    return this;
  }

  insert(payload: unknown) {
    this.op = 'insert';
    this.insertPayload = payload;
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.op = 'update';
    this.updatePayload = payload;
    return this;
  }

  delete() {
    this.op = 'delete';
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((item) => item[column] === value);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderConfig = { column, ascending: options?.ascending ?? true };
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  private execute(): { data: unknown; error: unknown } {
    const tableKey = `brainy_mock_${this.table}`;
    let records: Record<string, unknown>[] = [];
    try {
      const stored = localStorage.getItem(tableKey);
      records = stored ? JSON.parse(stored) : [];
    } catch {
      records = [];
    }

    const generateId = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return 'id_' + Math.random().toString(36).slice(2, 11);
    };

    const now = new Date().toISOString();

    if (this.op === 'insert') {
      const isArray = Array.isArray(this.insertPayload);
      const items = (isArray ? this.insertPayload : [this.insertPayload]) as Record<string, unknown>[];
      const inserted = items.map((item) => ({
        id: item?.id || generateId(),
        created_at: item?.created_at || now,
        updated_at: item?.updated_at || now,
        ...item,
      }));
      records.push(...inserted);
      try {
        localStorage.setItem(tableKey, JSON.stringify(records));
      } catch (err) {
        console.warn('LocalStorage save failed:', err);
      }
      const data = isArray ? inserted : (this.isSingle ? inserted[0] : inserted[0]);
      return { data, error: null };
    }

    if (this.op === 'update') {
      const updatedList: Record<string, unknown>[] = [];
      records = records.map((item) => {
        const matches = this.filters.every((fn) => fn(item));
        if (matches) {
          const updated = { ...item, ...this.updatePayload, updated_at: new Date().toISOString() };
          updatedList.push(updated);
          return updated;
        }
        return item;
      });
      try {
        localStorage.setItem(tableKey, JSON.stringify(records));
      } catch (err) {
        console.warn('LocalStorage update failed:', err);
      }
      const data = this.isSingle ? (updatedList[0] || null) : updatedList;
      return { data, error: null };
    }

    if (this.op === 'delete') {
      records = records.filter((item) => !this.filters.every((fn) => fn(item)));
      try {
        localStorage.setItem(tableKey, JSON.stringify(records));
      } catch (err) {
        console.warn('LocalStorage delete failed:', err);
      }
      return { data: null, error: null };
    }

    // op === 'select'
    const result = records.filter((item) => this.filters.every((fn) => fn(item)));

    if (this.orderConfig) {
      const { column, ascending } = this.orderConfig;
      result.sort((a, b) => {
        const valA = a[column];
        const valB = b[column];
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (valA < valB) return ascending ? -1 : 1;
        return ascending ? 1 : -1;
      });
    }

    if (this.isSingle) {
      return { data: result[0] || null, error: result[0] ? null : { message: 'Item not found' } };
    }

    if (this.isMaybeSingle) {
      return { data: result[0] || null, error: null };
    }

    return { data: result, error: null };
  }

  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    try {
      const res = this.execute();
      return Promise.resolve(res).then(onfulfilled, onrejected);
    } catch (err) {
      return Promise.reject(err).then(onfulfilled, onrejected);
    }
  }
}

// Export real Supabase client when configured, or local mock client when offline / unconfigured
export const supabase: ReturnType<typeof createClient> = isConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : ({
      from: (table: string) => new MockQueryBuilder(table),
    } as unknown as ReturnType<typeof createClient>);

