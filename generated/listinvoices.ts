/**
 * lightning-listinvoices -- Command for querying invoice status
 * 
 * **listinvoices** \[*label*\] \[*invstring*\] \[*payment_hash*\] \[*offer_id*\] 
 * 
 */

/**
 * The **listinvoices** RPC command gets the status of a specific invoice,
 * if it exists, or the status of all invoices if given no argument.
 * 
 * A specific invoice can be queried by providing either the `label`
 * provided when creating the invoice, the `invstring` string representing
 * the invoice, the `payment_hash` of the invoice, or the local `offer_id`
 * this invoice was issued for. Only one of the query parameters can be used at once.
*/
export interface ListinvoicesRequest {
  label?: /* GUESSED */ string;
  invstring?: /* GUESSED */ string;
  payment_hash?: /* GUESSED */ string;
  offer_id?: /* GUESSED */ string;
}

export interface ListinvoicesResponse {
  invoices: {
    [k: string]: unknown;
  }[];
}

