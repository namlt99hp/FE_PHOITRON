import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'adaptiveNumber',
	standalone: true,
})
export class AdaptiveNumberPipe implements PipeTransform {
	/**
	 * Format number with at least minDecimals, and extend decimals until
	 * first significant digit (up to maxDecimals). Does not mutate input.
	 */
	transform(value: number | string | null | undefined, minDecimals: number = 2, maxDecimals: number = 12): string {
		if (minDecimals < 0) minDecimals = 0;
		if (maxDecimals < minDecimals) maxDecimals = minDecimals;

		const num = typeof value === 'string' ? Number(value) : value as number;
		if (!Number.isFinite(num)) {
			// Fallback display for invalid numbers
			return (0).toFixed(minDecimals);
		}

		// Use toFixed to avoid scientific notation and to cap max decimals
		const fixed = num.toFixed(maxDecimals);
		const negative = fixed.startsWith('-');
		const str = negative ? fixed.slice(1) : fixed;

		const dotIdx = str.indexOf('.');
		if (dotIdx === -1) {
			// No decimal part; ensure minimum decimals
			const base = negative ? '-' + str : str;
			return base + (minDecimals > 0 ? '.' + '0'.repeat(minDecimals) : '');
		}

		const intPart = str.slice(0, dotIdx);
		const fracPart = str.slice(dotIdx + 1);

		// Find last non-zero in fractional part
		let lastNonZero = -1;
		for (let i = fracPart.length - 1; i >= 0; i--) {
			if (fracPart[i] !== '0') { lastNonZero = i; break; }
		}

		// Determine how many decimals to keep
		const keepDecimals = Math.max(minDecimals, lastNonZero + 1, 0);
		const keptFrac = keepDecimals > 0 ? fracPart.slice(0, keepDecimals) : '';

		const signedInt = negative ? '-' + intPart : intPart;
		return keptFrac.length > 0 ? `${signedInt}.${keptFrac}` : `${signedInt}${minDecimals > 0 ? '.' + '0'.repeat(minDecimals) : ''}`;
	}
}


