import { API_BASE_URL } from './fetchWithAuth';
import { setI18nBaseUrl } from '@aurasutra/doctor-shared/lib/i18n';

setI18nBaseUrl(API_BASE_URL);

export * from '@aurasutra/doctor-shared/lib/i18n';
