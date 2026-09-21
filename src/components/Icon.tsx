import {
  Calculator, BookOpen, Languages, Landmark, Globe, Leaf, Atom, FlaskConical,
  Brain, Sparkles, Camera, FileText, Lightbulb, HelpCircle, Layers,
  Star, Flame, CheckCircle, Moon, Trophy, Target, Zap, BookMarked,
  GraduationCap, Clock, TrendingUp, Award, MessageCircle, Send,
  Image, Upload, File, X, ChevronRight, ChevronLeft, ChevronDown,
  Home, ClipboardList, BarChart3, User, Plus, RefreshCw, Volume2,
  Eye, EyeOff, Settings, Edit3, Bookmark, Play, Pause, SkipForward,
  ThumbsUp, ThumbsDown, RotateCcw, ArrowRight, ArrowLeft, Search,
  Check, AlertCircle, Info, Lock, Shield, Calendar, Timer, ListChecks,
  PieChart, Activity, Menu, Bell, Gift, Crown, Rocket, Wand2,
  PencilLine, BookA, Sigma, Microscope, Globe2, History, MapPin,
} from 'lucide-react';
import type { ComponentType } from 'react';

const iconMap: Record<string, ComponentType<{ className?: string; size?: number | string }>> = {
  Calculator, BookOpen, Languages, Landmark, Globe, Leaf, Atom, FlaskConical,
  Brain, Sparkles, Camera, FileText, Lightbulb, HelpCircle, Layers,
  Star, Flame, CheckCircle, Moon, Trophy, Target, Zap, BookMarked,
  GraduationCap, Clock, TrendingUp, Award, MessageCircle, Send,
  Image, Upload, File, X, ChevronRight, ChevronLeft, ChevronDown,
  Home, ClipboardList, BarChart3, User, Plus, RefreshCw, Volume2,
  Eye, EyeOff, Settings, Edit3, Bookmark, Play, Pause, SkipForward,
  ThumbsUp, ThumbsDown, RotateCcw, ArrowRight, ArrowLeft, Search,
  Check, AlertCircle, Info, Lock, Shield, Calendar, Timer, ListChecks,
  PieChart, Activity, Menu, Bell, Gift, Crown, Rocket, Wand2,
  PencilLine, BookA, Sigma, Microscope, Globe2, History, MapPin,
};

export function Icon({ name, className, size }: { name: string; className?: string; size?: number | string }) {
  const Cmp = iconMap[name] || Sparkles;
  return <Cmp className={className} size={size} />;
}
