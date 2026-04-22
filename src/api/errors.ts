export class PriceApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "PriceApiError";
    this.status = status;
  }
}
