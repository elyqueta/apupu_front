export const environment = {
  /** Em Vercel o `/api/v1` é reescrito para https://apupu-back.onrender.com. */
  apiBaseUrl: '/api/v1',
  /** OAuth passa pelo rewrite do Vercel: mesma origem, cookie HttpOnly. */
  oauthBaseUrl: '',
  /** Google Maps Platform (Maps JavaScript API + Geocoding API). */
  googleMapsApiKey: 'AIzaSyCemWsnwPtBQuJQEVVynOeFRxD_hzlG7Nc',
};
