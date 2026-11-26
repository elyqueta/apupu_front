export const environment = {
  /** Base das chamadas `fetch` da aplicação. */
  apiBaseUrl: 'http://localhost:3000/api/v1',
  /**
   * Base para a navegação OAuth. Em dev o backend corre noutro porto e o
   * cookie de sessão usa `Path=/`.
   */
  oauthBaseUrl: 'http://localhost:3000',
  /** Google Maps Platform (Maps JavaScript API + Geocoding API). */
  googleMapsApiKey: 'AIzaSyCemWsnwPtBQuJQEVVynOeFRxD_hzlG7Nc',
  mapStyleUrl: 'https://tiles.openfreemap.org/styles/liberty',
};
