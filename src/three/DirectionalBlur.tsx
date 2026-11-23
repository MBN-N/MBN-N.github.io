import { forwardRef, useMemo } from 'react'
import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

const frag = /* glsl */ `
uniform float amount;
uniform float angle;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (amount < 0.0005) { outputColor = inputColor; return; }
  vec2 dir = vec2(cos(angle), sin(angle)) * amount;
  vec4 sum = vec4(0.0);
  const int N = 32;
  float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  for (int i = 0; i < N; i++) {
    float t = (float(i) + jitter) / float(N) - 0.5;
    sum += texture2D(inputBuffer, uv + dir * t);
  }
  outputColor = sum / float(N);
}`

export class DirectionalBlurEffect extends Effect {
  constructor() {
    super('DirectionalBlur', frag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['amount', new Uniform(0)],
        ['angle', new Uniform(0)],
      ]),
    })
  }
  set(amount: number, angle: number) {
    ;(this.uniforms.get('amount') as Uniform).value = amount
    ;(this.uniforms.get('angle') as Uniform).value = angle
  }
}

export const DirectionalBlur = forwardRef<DirectionalBlurEffect>(function DirectionalBlur(_p, ref) {
  const effect = useMemo(() => new DirectionalBlurEffect(), [])
  return <primitive ref={ref} object={effect} dispose={null} />
})
