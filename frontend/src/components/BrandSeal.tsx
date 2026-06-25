/**
 * Selo da marca "Café com Propósito" (xícara + sol nascente + livro + vapor).
 * Recriação fiel do `coreSymbol`/`minSymbol` do design system em SVG nativo.
 *
 *   <BrandSeal size={148} color="#F0E0C6" />        // completo (splash, onboarding)
 *   <BrandSeal size={60} variant="min" color="#5B4636" />  // minimal (cabeçalhos)
 */
import Svg, {
  G,
  Path,
  Line,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  /** Quando true, o sol usa o gradiente dourado; senão, a cor do traço. */
  goldSun?: boolean;
  variant?: 'core' | 'min';
};

export default function BrandSeal({
  size = 120,
  color = '#F0E0C6',
  goldSun = true,
  variant = 'core',
}: Props) {
  const sunFill = goldSun ? 'url(#ccpGold)' : color;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <LinearGradient id="ccpGold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#E6C079" />
          <Stop offset="100%" stopColor="#C8924A" />
        </LinearGradient>
      </Defs>

      {variant === 'core' ? (
        <>
          {/* vapor */}
          <G fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M92,54 C86,46 98,42 92,34 C87,27 96,24 91,18" />
            <Path d="M108,54 C114,46 102,42 108,34 C113,27 104,24 109,18" />
          </G>
          {/* raios */}
          <G stroke={color} strokeWidth={3.6} strokeLinecap="round">
            <Line x1="100" y1="60" x2="100" y2="51" />
            <Line x1="119.4" y1="66.3" x2="124.7" y2="59.0" />
            <Line x1="80.6" y1="66.3" x2="75.3" y2="59.0" />
            <Line x1="128.6" y1="76.5" x2="136.4" y2="72.0" />
            <Line x1="71.4" y1="76.5" x2="63.6" y2="72.0" />
          </G>
          {/* sol */}
          <Path d="M73,93 A27,27 0 0 1 127,93 Z" fill={sunFill} />
          {/* xícara */}
          <G fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
            <Line x1="61" y1="93" x2="139" y2="93" />
            <Path d="M64,93 C63,120 76,143 100,143 C124,143 137,120 136,93" />
            <Path d="M138,101 C159,99 160,125 135,123" />
          </G>
          {/* livro */}
          <G fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M100,150 C84,145 66,146 53,151 C54,156 54,159 55,163 C68,158 85,158 100,163" />
            <Path d="M100,150 C116,145 134,146 147,151 C146,156 146,159 145,163 C132,158 115,158 100,163" />
            <Line x1="100" y1="150" x2="100" y2="163" />
          </G>
        </>
      ) : (
        <>
          <G fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M100,52 C94,44 106,40 100,32" />
          </G>
          <G stroke={color} strokeWidth={4.4} strokeLinecap="round">
            <Line x1="100" y1="58" x2="100" y2="49" />
            <Line x1="124" y1="68" x2="131" y2="62" />
            <Line x1="76" y1="68" x2="69" y2="62" />
          </G>
          <Circle cx="100" cy="96" r="23" fill={sunFill} />
          <G fill="none" stroke={color} strokeWidth={5.4} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M66,96 C65,124 78,148 100,148 C122,148 135,124 134,96" />
            <Path d="M136,104 C158,102 159,129 133,127" />
            <Line x1="62" y1="96" x2="138" y2="96" />
            <Line x1="60" y1="162" x2="140" y2="162" />
          </G>
        </>
      )}
    </Svg>
  );
}
