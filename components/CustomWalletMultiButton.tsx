"use client";
import React, { PropsWithChildren, ReactElement, MouseEvent, CSSProperties, useState, useEffect } from 'react';
import { BaseWalletMultiButton } from '@solana/wallet-adapter-react-ui';

type ButtonProps = PropsWithChildren<{
    className?: string;
    disabled?: boolean;
    endIcon?: ReactElement;
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    startIcon?: ReactElement;
    style?: CSSProperties;
    tabIndex?: number;
}>;

const JAPANESE_LABELS = {
    'change-wallet': 'ウォレットを変更',
    connecting: '接続中...',
    'copy-address': 'アドレスをコピー',
    copied: 'コピー済み',
    disconnect: '切断',
    'has-wallet': '接続',
    'no-wallet': 'ウォレットを選択',
} as const;

export function CustomWalletMultiButton(props: ButtonProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    return isClient ? <BaseWalletMultiButton {...props} labels={JAPANESE_LABELS} /> : null;

}
