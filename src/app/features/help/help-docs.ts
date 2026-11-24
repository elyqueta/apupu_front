import criarConta from '../../../content/docs/01-criar-conta.md';
import criarEvento from '../../../content/docs/02-criar-evento.md';
import partilhar from '../../../content/docs/03-partilhar.md';
import publicoPrivado from '../../../content/docs/04-publico-privado.md';
import comunidades from '../../../content/docs/05-comunidades-equipas.md';
import gestor from '../../../content/docs/06-gestor-link-codigo.md';
import perfil from '../../../content/docs/07-perfil.md';
import amigos from '../../../content/docs/08-amigos.md';
import faq from '../../../content/docs/09-perguntas-frequentes.md';
import { HelpDoc, toHelpDoc } from './markdown.util';

/** Guias da ajuda, pela ordem do índice. Conteúdo em `src/content/docs`. */
export const HELP_DOCS: HelpDoc[] = [
  toHelpDoc('criar-conta', criarConta),
  toHelpDoc('criar-evento', criarEvento),
  toHelpDoc('partilhar', partilhar),
  toHelpDoc('publico-privado', publicoPrivado),
  toHelpDoc('comunidades-equipas', comunidades),
  toHelpDoc('gestor-link-codigo', gestor),
  toHelpDoc('perfil', perfil),
  toHelpDoc('amigos', amigos),
  toHelpDoc('perguntas-frequentes', faq),
];
