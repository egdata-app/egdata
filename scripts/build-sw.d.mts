export interface BuiltServiceWorker {
  code: Buffer;
  hash: string;
  count: number;
  size: number;
  warnings: string[];
}

export function buildServiceWorker(root?: string): Promise<BuiltServiceWorker>;
export function writeServiceWorker(destPath: string, code: Buffer): Promise<void>;
