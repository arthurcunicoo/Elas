import {fileURLToPath} from 'node:url';
export function operationalReadiness(env=process.env) {
 const present=names=>names.every(name=>Boolean(env[name]));
 return {kind:'configuration-only',productionChanges:false,requirements:{
  staging:present(['QA_SUPABASE_URL','QA_PUBLISHABLE_KEY']),
  threeQaAccounts:present(['QA_EMAIL_A','QA_PASSWORD_A','QA_EMAIL_B','QA_PASSWORD_B','QA_EMAIL_ADMIN','QA_PASSWORD_ADMIN']),
  recoveryMailbox:present(['QA_RECOVERY_EMAIL']),
  sentry:present(['EXPO_PUBLIC_SENTRY_DSN']),
  expoProject:present(['EAS_PROJECT_ID']),
  expoAccessToken:present(['EXPO_ACCESS_TOKEN']),
  backup:present(['BACKUP_DB_URL','BACKUP_STORAGE_DIR','BACKUP_CONFIG_FILE']),
  disposableRestore:present(['RESTORE_DB_URL','RESTORE_PROJECT_REF'])&&env.RESTORE_CONFIRM==='disposable-staging',
 },notice:'Configuration presence is not proof of valid credentials, SMTP delivery, physical push or a completed restore.'};
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(operationalReadiness(),null,2));
