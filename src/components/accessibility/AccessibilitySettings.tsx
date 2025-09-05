/**
 * Accessibility settings component for user preferences
 */

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useAccessibility } from '@/hooks/useAccessibility';

export interface AccessibilitySettingsProps {
  className?: string;
  onSettingsChange?: (settings: AccessibilityPreferences) => void;
}

interface AccessibilityPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  fontSize: number;
  focusIndicators: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigation: boolean;
}

export function AccessibilitySettings({ className, onSettingsChange }: AccessibilitySettingsProps) {
  const accessibility = useAccessibility();
  
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    fontSize: 16,
    focusIndicators: true,
    screenReaderOptimized: false,
    keyboardNavigation: false,
  });

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('accessibility-preferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences(parsed);
      } catch (error) {
        console.error('Failed to parse accessibility preferences:', error);
      }
    }

    // Detect system preferences
    setPreferences(prev => ({
      ...prev,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
    }));
  }, []);

  // Save preferences to localStorage and apply changes
  useEffect(() => {
    localStorage.setItem('accessibility-preferences', JSON.stringify(preferences));
    onSettingsChange?.(preferences);
    applyAccessibilitySettings(preferences);
  }, [preferences, onSettingsChange]);

  const applyAccessibilitySettings = (settings: AccessibilityPreferences) => {
    const root = document.documentElement;
    const body = document.body;

    // Apply font size
    root.style.fontSize = `${settings.fontSize}px`;

    // Apply high contrast
    body.classList.toggle('high-contrast', settings.highContrast);

    // Apply reduced motion
    body.classList.toggle('reduced-motion', settings.reducedMotion);

    // Apply large text
    body.classList.toggle('large-text', settings.largeText);

    // Apply focus indicators
    body.classList.toggle('enhanced-focus', settings.focusIndicators);

    // Apply screen reader optimizations
    body.classList.toggle('screen-reader-optimized', settings.screenReaderOptimized);
  };

  const updatePreference = <K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    const defaults: AccessibilityPreferences = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      largeText: false,
      fontSize: 16,
      focusIndicators: true,
      screenReaderOptimized: false,
      keyboardNavigation: false,
    };
    setPreferences(defaults);
  };

  return (
    <Card className={cn('accessibility-settings', className)}>
      <CardHeader>
        <CardTitle>Accessibility Settings</CardTitle>
        <CardDescription>
          Customize the interface to meet your accessibility needs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Visual Settings</h3>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="high-contrast" className="flex flex-col space-y-1">
              <span>High Contrast Mode</span>
              <span className="text-sm text-muted-foreground">
                Increases contrast for better visibility
              </span>
            </Label>
            <Switch
              id="high-contrast"
              checked={preferences.highContrast}
              onCheckedChange={(checked) => updatePreference('highContrast', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="large-text" className="flex flex-col space-y-1">
              <span>Large Text</span>
              <span className="text-sm text-muted-foreground">
                Increases text size throughout the interface
              </span>
            </Label>
            <Switch
              id="large-text"
              checked={preferences.largeText}
              onCheckedChange={(checked) => updatePreference('largeText', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="font-size">
              Font Size: {preferences.fontSize}px
            </Label>
            <Slider
              id="font-size"
              min={12}
              max={24}
              step={1}
              value={[preferences.fontSize]}
              onValueChange={([value]) => updatePreference('fontSize', value)}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="focus-indicators" className="flex flex-col space-y-1">
              <span>Enhanced Focus Indicators</span>
              <span className="text-sm text-muted-foreground">
                Makes focus indicators more visible for keyboard navigation
              </span>
            </Label>
            <Switch
              id="focus-indicators"
              checked={preferences.focusIndicators}
              onCheckedChange={(checked) => updatePreference('focusIndicators', checked)}
            />
          </div>
        </div>

        {/* Motion Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Motion Settings</h3>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="reduced-motion" className="flex flex-col space-y-1">
              <span>Reduce Motion</span>
              <span className="text-sm text-muted-foreground">
                Minimizes animations and transitions
              </span>
            </Label>
            <Switch
              id="reduced-motion"
              checked={preferences.reducedMotion}
              onCheckedChange={(checked) => updatePreference('reducedMotion', checked)}
            />
          </div>
        </div>

        {/* Navigation Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Navigation Settings</h3>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="keyboard-navigation" className="flex flex-col space-y-1">
              <span>Keyboard Navigation</span>
              <span className="text-sm text-muted-foreground">
                Optimizes interface for keyboard-only navigation
              </span>
            </Label>
            <Switch
              id="keyboard-navigation"
              checked={preferences.keyboardNavigation}
              onCheckedChange={(checked) => updatePreference('keyboardNavigation', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="screen-reader" className="flex flex-col space-y-1">
              <span>Screen Reader Optimization</span>
              <span className="text-sm text-muted-foreground">
                Optimizes interface for screen reader users
              </span>
            </Label>
            <Switch
              id="screen-reader"
              checked={preferences.screenReaderOptimized}
              onCheckedChange={(checked) => updatePreference('screenReaderOptimized', checked)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button onClick={resetToDefaults} variant="outline">
            Reset to Defaults
          </Button>
        </div>

        {/* Current Status */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Current accessibility status:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            {accessibility.isScreenReaderActive && (
              <li>Screen reader detected</li>
            )}
            {accessibility.prefersReducedMotion && (
              <li>System prefers reduced motion</li>
            )}
            {accessibility.prefersHighContrast && (
              <li>System prefers high contrast</li>
            )}
            {accessibility.isKeyboardNavigation && (
              <li>Keyboard navigation active</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Quick accessibility toggle buttons
 */
export function AccessibilityQuickToggles({ className }: { className?: string }) {
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const body = document.body;
    body.classList.toggle('high-contrast', highContrast);
    body.classList.toggle('large-text', largeText);
    body.classList.toggle('reduced-motion', reducedMotion);
  }, [highContrast, largeText, reducedMotion]);

  return (
    <div className={cn('flex gap-2 flex-wrap', className)}>
      <Button
        variant={highContrast ? 'default' : 'outline'}
        size="sm"
        onClick={() => setHighContrast(!highContrast)}
        aria-pressed={highContrast}
      >
        High Contrast
      </Button>
      <Button
        variant={largeText ? 'default' : 'outline'}
        size="sm"
        onClick={() => setLargeText(!largeText)}
        aria-pressed={largeText}
      >
        Large Text
      </Button>
      <Button
        variant={reducedMotion ? 'default' : 'outline'}
        size="sm"
        onClick={() => setReducedMotion(!reducedMotion)}
        aria-pressed={reducedMotion}
      >
        Reduce Motion
      </Button>
    </div>
  );
}