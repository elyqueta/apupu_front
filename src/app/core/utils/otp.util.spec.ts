import { distributeOtpDigits } from './otp.util';

const EMPTY = ['', '', '', '', '', ''];

describe('distributeOtpDigits', () => {
  it('preenche as seis caixas com um código completo', () => {
    expect(distributeOtpDigits(EMPTY, '482916')).toEqual(['4', '8', '2', '9', '1', '6']);
  });

  it('ignora espaços, hífenes e letras', () => {
    expect(distributeOtpDigits(EMPTY, '48-29 16')).toEqual(['4', '8', '2', '9', '1', '6']);
  });

  it('preenche a partir da caixa atual quando o código é parcial', () => {
    expect(distributeOtpDigits(EMPTY, '29', 2)).toEqual(['', '', '2', '9', '', '']);
  });

  it('limpa as caixas depois do trecho colado', () => {
    expect(distributeOtpDigits(['1', '2', '3', '4', '5', '6'], '98', 2)).toEqual([
      '1',
      '2',
      '9',
      '8',
      '',
      '',
    ]);
  });

  it('usa o fim do texto quando o browser junta o dígito existente ao código', () => {
    expect(distributeOtpDigits(['4', '', '', '', '', ''], '4482916')).toEqual([
      '4',
      '8',
      '2',
      '9',
      '1',
      '6',
    ]);
  });

  it('mantém as caixas quando o texto não tem dígitos', () => {
    expect(distributeOtpDigits(['1', '2', '3', '4', '5', '6'], 'abc')).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
  });
});
