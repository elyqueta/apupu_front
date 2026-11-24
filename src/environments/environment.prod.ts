export const environment = {
  /** Em Vercel o `/api/v1` é reescrito para https://apupu-back.onrender.com. */
  apiBaseUrl: '/api/v1',
  /**
   * Vazio = mesma origem. `/auth/google` e `/auth/google/callback` são
   * reescritos pelo Vercel para o backend, pelo que o cookie HttpOnly fica
   * associado a apupu-front.vercel.app e é enviado nas chamadas `/api/v1`.
   */
  oauthBaseUrl: '',
  /** Google Maps Platform (Maps JavaScript API + Geocoding API). */
  googleMapsApiKey: 'AIzaSyCemWsnwPtBQuJQEVVynOeFRxD_hzlG7Nc',
};
