/**
 * lightning-decode -- Command for decoding an invoice string (low-level)
 * 
 * **decode** *string* 
 * 
 */

/**
 * The **decode** RPC command checks and parses a *bolt11* or *bolt12*
 * string (optionally prefixed by `lightning:` or `LIGHTNING:`) as
 * specified by the BOLT 11 and BOLT 12 specifications.  It may decode
 * other formats in future.
*/
export interface DecodeRequest {
  string: /* GUESSED */ string;
}

export type DecodeResponse = {
  [k: string]: unknown;
} & {
  /**
   * what kind of object it decoded to
   */
  type: "bolt12 offer" | "bolt12 invoice" | "bolt12 invoice_request" | "bolt11 invoice";
  /**
   * if this is false, you *MUST* not use the result except for diagnostics!
   */
  valid: boolean;
  [k: string]: unknown;
};

