function currentCookies(): string {
    return typeof document === 'undefined' ? '' : document.cookie;
}

function currentMetaToken(): string | null {
    if (typeof document === 'undefined') {
        return null;
    }

    return (
        document
            .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? null
    );
}

export function cookieValue(name: string, cookies: string): string | null {
    const prefix = `${name}=`;
    const cookie = cookies
        .split(';')
        .map((value) => value.trim())
        .find((value) => value.startsWith(prefix));

    if (!cookie) {
        return null;
    }

    const value = cookie.slice(prefix.length);

    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export function csrfHeaders(
    cookies: string = currentCookies(),
    metaToken: string | null = currentMetaToken(),
): Record<string, string> {
    const xsrfToken = cookieValue('XSRF-TOKEN', cookies);

    if (xsrfToken) {
        return { 'X-XSRF-TOKEN': xsrfToken };
    }

    return metaToken ? { 'X-CSRF-TOKEN': metaToken } : {};
}
