declare module 'shiki' {
  export interface ShikiTransformer {
    name?: string;
    pre?: (node: any) => void;
    code?: (node: any) => void;
    line?: (node: any) => void;
  }

  export function codeToHtml(
    code: string,
    options: {
      lang?: string;
      theme?: string;
      themes?: { light?: string; dark?: string };
      transformers?: ShikiTransformer[];
    }
  ): Promise<string>;
}
