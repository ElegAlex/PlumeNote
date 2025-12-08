// ===========================================
// Type declarations for html2pdf.js
// ===========================================

declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | [number, number, number, number];
    filename?: string;
    image?: {
      type?: 'jpeg' | 'png' | 'webp';
      quality?: number;
    };
    enableLinks?: boolean;
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
      letterRendering?: boolean;
      logging?: boolean;
      allowTaint?: boolean;
      backgroundColor?: string;
    };
    jsPDF?: {
      unit?: 'pt' | 'mm' | 'cm' | 'in';
      format?: 'a0' | 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'letter' | 'legal' | string | [number, number];
      orientation?: 'portrait' | 'landscape';
      compress?: boolean;
    };
    pagebreak?: {
      mode?: string | string[];
      before?: string | string[];
      after?: string | string[];
      avoid?: string | string[];
    };
  }

  interface Html2PdfWorker {
    set(options: Html2PdfOptions): Html2PdfWorker;
    from(element: HTMLElement | string): Html2PdfWorker;
    save(): Promise<void>;
    output(type: 'blob'): Promise<Blob>;
    output(type: 'datauristring'): Promise<string>;
    output(type: 'arraybuffer'): Promise<ArrayBuffer>;
    toPdf(): Html2PdfWorker;
    get(type: 'pdf'): Promise<unknown>;
  }

  function html2pdf(): Html2PdfWorker;
  function html2pdf(element: HTMLElement, options?: Html2PdfOptions): Html2PdfWorker;

  export = html2pdf;
}
