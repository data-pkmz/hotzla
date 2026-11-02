declare module 'node-ews' {
  export interface EwsConfig {
    username: string;
    password?: string;
    host: string;
    auth?: 'ntlm' | 'basic' | 'bearer';
    domain?: string;
    temp?: string;
    [key: string]: unknown;
  }

  export interface EwsOptions {
    rejectUnauthorized?: boolean;
    strictSSL?: boolean;
    [key: string]: unknown;
  }

  export class EWS {
    constructor(config: EwsConfig, options?: EwsOptions);
    run(ewsFunction: string, ewsArgs: Record<string, unknown>): Promise<unknown>;
  }

  export default EWS;
}
