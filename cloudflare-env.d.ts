declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    MESSAGING_ENCRYPTION_KEY?: string;
    BUCKET?: R2Bucket;
  }
}
