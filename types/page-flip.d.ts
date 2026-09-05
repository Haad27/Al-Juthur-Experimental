// Type declaration for 'page-flip' (ships without bundled .d.ts files)
declare module 'page-flip' {
  export interface PageFlipOptions {
    width: number;
    height: number;
    size?: 'fixed' | 'stretch';
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startZIndex?: number;
    autoSize?: boolean;
    maxShadowOpacity?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    swipeDistance?: number;
    clickEventForward?: boolean;
    useMouseEvents?: boolean;
    startPage?: number;
  }

  export type PageFlipEvent =
    | 'flip'
    | 'changeOrientation'
    | 'changeState'
    | 'init'
    | 'update';

  export class PageFlip {
    constructor(container: HTMLElement, options: PageFlipOptions);
    loadFromHTML(elements: HTMLElement[]): void;
    updateFromHtml(elements: HTMLElement[]): void;
    clear(): void;
    destroy(): void;
    on(event: PageFlipEvent, handler: (e: any) => void): void;
    off(event: PageFlipEvent): void;
    getFlipController(): any;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    flipNext(corner?: 'top' | 'bottom'): void;
    flipPrev(corner?: 'top' | 'bottom'): void;
    flip(pageNum: number, corner?: 'top' | 'bottom'): void;
    turnToPage(pageNum: number): void;
    turnToNextPage(): void;
    turnToPrevPage(): void;
    getOrientation(): 'portrait' | 'landscape';
    getBoundsRect(): { pageWidth: number; pageHeight: number; left: number; top: number; width: number; height: number };
  }
}
