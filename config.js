// Public settings for the front end. The URL and the publishable key are public by design:
// row-level security in the database decides what each login can read or write.
window.HSRI_CODING_CONFIG = {
  url: 'https://srnsptrpeoylqzbtrtzj.supabase.co',
  anonKey: 'sb_publishable_XPe3PFNjFGHXqYwPA2AISw_J4oVnbs0',   // publishable key (public)
  loginDomain: 'hsricode.test',   // username "percy" signs in as percy@hsricode.test
};
