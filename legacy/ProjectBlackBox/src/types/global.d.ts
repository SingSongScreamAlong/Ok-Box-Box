// Global type declarations
declare const __dirname: string;
declare const process: {
  platform: string;
  env: Record<string, string>;
  versions: {
    electron: string;
    chrome: string;
    node: string;
  };
  argv: string[];
};
