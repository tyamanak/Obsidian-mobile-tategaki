import type { VerticalReaderSettings } from "./settings";

export interface PagingCallbacks {
  onProgressChange(progress: number): void;
  onUiToggle(): void;
}

export class PagingController {
  private touchStartX: number | null = null;
  private touchStartY: number | null = null;
  private saveTimer: number | null = null;

  constructor(
    private readonly scroller: HTMLElement,
    private readonly settings: VerticalReaderSettings,
    private readonly callbacks: PagingCallbacks,
  ) {}

  next(): void {
    this.scrollByPage(1);
  }

  previous(): void {
    this.scrollByPage(-1);
  }

  restore(progress: number): void {
    window.requestAnimationFrame(() => {
      const max = this.maxScroll();
      this.scroller.scrollLeft = this.progressToScrollLeft(progress, max);
      this.reportProgress();
    });
  }

  currentProgress(): number {
    const max = this.maxScroll();
    if (max <= 0) {
      return 0;
    }

    if (this.isVerticalRightToLeft()) {
      return clamp(1 - this.scroller.scrollLeft / max, 0, 1);
    }

    return clamp(this.scroller.scrollLeft / max, 0, 1);
  }

  handleTap(clientX: number): void {
    if (!this.settings.reading.tapToTurnPage) {
      return;
    }

    const rect = this.scroller.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const third = rect.width / 3;

    if (relativeX < third) {
      this.next();
      return;
    }

    if (relativeX > third * 2) {
      this.previous();
      return;
    }

    this.callbacks.onUiToggle();
  }

  handleTouchStart(event: TouchEvent): void {
    if (!this.settings.reading.swipeToTurnPage || event.touches.length !== 1) {
      return;
    }

    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
  }

  handleTouchEnd(event: TouchEvent): void {
    if (
      !this.settings.reading.swipeToTurnPage ||
      this.touchStartX === null ||
      this.touchStartY === null ||
      event.changedTouches.length !== 1
    ) {
      this.clearTouch();
      return;
    }

    const dx = event.changedTouches[0].clientX - this.touchStartX;
    const dy = event.changedTouches[0].clientY - this.touchStartY;
    this.clearTouch();

    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.4) {
      return;
    }

    if (dx < 0) {
      this.next();
    } else {
      this.previous();
    }
  }

  handleScroll(): void {
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
    }

    this.saveTimer = window.setTimeout(() => {
      this.reportProgress();
      this.saveTimer = null;
    }, 120);
  }

  handleResize(): void {
    const progress = this.currentProgress();
    window.requestAnimationFrame(() => this.restore(progress));
  }

  destroy(): void {
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }

  private scrollByPage(direction: 1 | -1): void {
    const pageWidth = this.scroller.clientWidth || window.innerWidth;
    const scrollDirection = this.isVerticalRightToLeft() ? -direction : direction;
    const target = clamp(
      this.scroller.scrollLeft + pageWidth * scrollDirection,
      0,
      this.maxScroll(),
    );

    this.scroller.scrollTo({
      left: target,
      behavior: "smooth",
    });
  }

  private reportProgress(): void {
    this.callbacks.onProgressChange(this.currentProgress());
  }

  private maxScroll(): number {
    return Math.max(0, this.scroller.scrollWidth - this.scroller.clientWidth);
  }

  private progressToScrollLeft(progress: number, max: number): number {
    const safeProgress = clamp(progress, 0, 1);
    if (this.isVerticalRightToLeft()) {
      return max * (1 - safeProgress);
    }

    return max * safeProgress;
  }

  private isVerticalRightToLeft(): boolean {
    return this.settings.reading.writingMode === "vertical-rl";
  }

  private clearTouch(): void {
    this.touchStartX = null;
    this.touchStartY = null;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
