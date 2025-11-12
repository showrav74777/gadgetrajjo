import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center space-y-4 max-w-md">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">কিছু সমস্যা হয়েছে</h1>
            <p className="text-muted-foreground">
              {this.state.error?.message || 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে'}
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
              >
                হোমে ফিরে যান
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                পৃষ্ঠা রিফ্রেশ করুন
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

