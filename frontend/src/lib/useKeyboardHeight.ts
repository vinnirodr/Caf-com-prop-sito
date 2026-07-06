/**
 * Altura atual do teclado (0 quando fechado).
 *
 * Usado onde o `softwareKeyboardLayoutMode: "pan"` do Android não alcança — em
 * especial dentro de um `Modal` (janela separada, que o pan não sobe). Aplicando
 * a altura como `marginBottom`/`paddingBottom`, levantamos o conteúdo acima do
 * teclado de forma determinística (dirigida por eventos, não por layout do SO).
 */
import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export function useKeyboardHeight(): number {
  const [altura, setAltura] = useState(0);

  useEffect(() => {
    // iOS emite os eventos "will…" (animação suave); Android só os "did…".
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const mostrar = Keyboard.addListener(showEvt, (e) =>
      setAltura(e.endCoordinates?.height ?? 0)
    );
    const esconder = Keyboard.addListener(hideEvt, () => setAltura(0));

    return () => {
      mostrar.remove();
      esconder.remove();
    };
  }, []);

  return altura;
}
