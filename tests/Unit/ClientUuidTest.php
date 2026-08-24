<?php

use Symfony\Component\Process\Process;

test('client UUID generation supports browsers without randomUUID', function () {
    $script = <<<'JS'
        import { createUuid } from './resources/js/lib/uuid.ts';

        const nativeUuid = '123e4567-e89b-42d3-a456-426614174000';
        const nativeResult = createUuid({ randomUUID: () => nativeUuid });
        const webCryptoFallback = createUuid({
            getRandomValues(bytes) {
                bytes.forEach((_, index) => {
                    bytes[index] = index;
                });

                return bytes;
            },
        });
        const legacyFallback = createUuid({}, () => 0.5);

        console.log(JSON.stringify({ nativeResult, webCryptoFallback, legacyFallback }));
        JS;

    $process = new Process([
        'node',
        '--experimental-strip-types',
        '--input-type=module',
        '--eval',
        $script,
    ], dirname(__DIR__, 2));
    $process->mustRun();

    $uuids = json_decode(
        trim($process->getOutput()),
        associative: true,
        flags: JSON_THROW_ON_ERROR,
    );

    expect($uuids)
        ->nativeResult->toBe('123e4567-e89b-42d3-a456-426614174000')
        ->webCryptoFallback->toBe('00010203-0405-4607-8809-0a0b0c0d0e0f')
        ->legacyFallback->toMatch(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/',
        );
});
