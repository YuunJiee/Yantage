import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDelete } from './confirm-delete';

describe('ConfirmDelete', () => {
    it('renders the default label and both buttons', () => {
        render(<ConfirmDelete onConfirm={() => {}} onCancel={() => {}} />);
        expect(screen.getByText('確定刪除？')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '確定' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
    });

    it('renders a custom label when provided', () => {
        render(<ConfirmDelete onConfirm={() => {}} onCancel={() => {}} label="真的要刪除嗎？" />);
        expect(screen.getByText('真的要刪除嗎？')).toBeInTheDocument();
    });

    it('calls onConfirm when the confirm button is clicked', () => {
        const onConfirm = vi.fn();
        render(<ConfirmDelete onConfirm={onConfirm} onCancel={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: '確定' }));
        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it('calls onCancel when the cancel button is clicked', () => {
        const onCancel = vi.fn();
        render(<ConfirmDelete onConfirm={() => {}} onCancel={onCancel} />);
        fireEvent.click(screen.getByRole('button', { name: '取消' }));
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('shows a loading label and disables the confirm button while loading', () => {
        render(<ConfirmDelete onConfirm={() => {}} onCancel={() => {}} loading />);
        const confirmButton = screen.getByRole('button', { name: '刪除中…' });
        expect(confirmButton).toBeDisabled();
    });
});
