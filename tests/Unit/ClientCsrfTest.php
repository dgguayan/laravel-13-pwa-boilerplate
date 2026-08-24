<?php

use Symfony\Component\Process\Process;

test('client synchronization prefers Laravels XSRF cookie over cached metadata', function () {
    $script = <<<'JS'
        import { csrfHeaders } from './resources/js/lib/csrf.ts';

        const cookieHeaders = csrfHeaders(
            'theme=dark; XSRF-TOKEN=fresh%3Dencrypted%3Dtoken; session=abc',
            'stale-meta-token',
        );
        const metaHeaders = csrfHeaders('', 'current-meta-token');
        const missingHeaders = csrfHeaders('', null);

        console.log(JSON.stringify({ cookieHeaders, metaHeaders, missingHeaders }));
        JS;

    $process = new Process([
        'node',
        '--experimental-strip-types',
        '--input-type=module',
        '--eval',
        $script,
    ], dirname(__DIR__, 2));
    $process->mustRun();

    $headers = json_decode(
        trim($process->getOutput()),
        associative: true,
        flags: JSON_THROW_ON_ERROR,
    );

    expect($headers)
        ->cookieHeaders->toBe([
            'X-XSRF-TOKEN' => 'fresh=encrypted=token',
        ])
        ->metaHeaders->toBe([
            'X-CSRF-TOKEN' => 'current-meta-token',
        ])
        ->missingHeaders->toBe([]);
});
