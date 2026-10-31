import 'next-auth';
import 'next-auth/jwt';
declare module 'next-auth' { interface Session { billingIdentity?: string; } }
declare module 'next-auth/jwt' { interface JWT { billingIdentity?: string; } }
