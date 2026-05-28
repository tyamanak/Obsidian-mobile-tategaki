export interface ReaderAnnotation {
  id: string;
  filePath: string;
  createdAt: string;
  type: "highlight" | "extract";
  color?: "yellow" | "blue" | "pink" | "green";
  textQuote: {
    exact: string;
    prefix: string;
    suffix: string;
  };
  note?: string;
}

export class AnnotationStore {
  private annotations: ReaderAnnotation[] = [];

  all(): ReaderAnnotation[] {
    return [...this.annotations];
  }
}
