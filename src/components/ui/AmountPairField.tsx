import type { Amounts } from "@/lib/format/money";
import { AmountField } from "./AmountField";

type AmountPairFieldProps = {
	/** Names the pair for screen readers, e.g. "Cash" gives "Cash USD" and "Cash LBP". */
	label: string;
	value: Amounts;
	onChange: (value: Amounts) => void;
};

/** The USD field next to the LBP field, holding one Amounts value. */
export function AmountPairField({ label, value, onChange }: AmountPairFieldProps) {
	return (
		<div className="grid grid-cols-2 gap-3">
			<AmountField currency="USD" value={value.usd} onChange={(usd) => onChange({ ...value, usd })} label={`${label} USD`} />
			<AmountField currency="LBP" value={value.lbp} onChange={(lbp) => onChange({ ...value, lbp })} label={`${label} LBP`} />
		</div>
	);
}
