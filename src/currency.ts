export function transform(x: number): number {
  return Math.floor((x + 0.001) * 100)
}

export function calculate(calcFn: (currency: number[]) => number, ...currency: number[]): number {
  return calcFn(currency.map(x => transform(x))) / 100
}

export function plus(...currency: number[]): number {
  return calculate(nums => nums.reduce((total, current) => total + current), ...currency)
}
