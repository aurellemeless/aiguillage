import { stampClassForStatus } from '@/lib/status';

export default function StatusStamp({ status }: { status: string }) {
	return <span className={`stamp ${stampClassForStatus(status)}`}>{status}</span>;
}
