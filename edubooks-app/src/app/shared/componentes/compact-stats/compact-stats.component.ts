import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

export interface CompactStatistics {
  total: number;
  pending: number;
  completed: number;
  expired: number;
  successRate?: number;
}

@Component({
  selector: 'app-compact-stats',
  templateUrl: './compact-stats.component.html',
  styleUrls: ['./compact-stats.component.scss'],
  standalone: false
})
export class CompactStatsComponent implements OnInit, OnChanges {
  
  @Input() statistics: CompactStatistics | null = null;
  @Input() showSuccessRate: boolean = true;
  @Input() animateOnLoad: boolean = true;
  @Input() title: string = '';
  @Input() loading: boolean = false;

  constructor() { }

  ngOnInit(): void {
    // Trigger animation after component initialization
    if (this.animateOnLoad) {
      setTimeout(() => {
        this.triggerAnimation();
      }, 100);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Re-trigger animation when statistics change
    if (changes['statistics'] && !changes['statistics'].firstChange) {
      if (this.animateOnLoad) {
        this.triggerAnimation();
      }
    }
  }

  private triggerAnimation(): void {
    // Add animation class to trigger CSS animations
    const elements = document.querySelectorAll('.compact-stats-container .stat-item, .compact-stats-container .success-rate-container');
    elements.forEach((element, index) => {
      setTimeout(() => {
        element.classList.add('animate-in');
      }, index * 100);
    });
  }

  /**
   * Get the total count of all statistics
   */
  getTotalCount(): number {
    if (!this.statistics) return 0;
    return this.statistics.total || 0;
  }

  /**
   * Check if there are any statistics to show
   */
  hasStatistics(): boolean {
    return this.statistics !== null && this.getTotalCount() > 0;
  }

  /**
   * Get the percentage for a specific stat type
   */
  getPercentage(value: number): number {
    const total = this.getTotalCount();
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  /**
   * Format large numbers with K, M suffixes
   */
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}