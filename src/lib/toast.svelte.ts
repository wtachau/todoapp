let message = $state<string | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;

export function toast(msg: string, duration = 2500) {
	message = msg;
	if (timer) clearTimeout(timer);
	timer = setTimeout(() => { message = null; }, duration);
}

export const toastState = {
	get message() { return message; }
};
