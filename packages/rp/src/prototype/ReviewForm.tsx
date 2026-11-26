import { createReviewAuthors, ReviewForm as BaseReviewForm } from '@weiran-tech/prototype';
import type { ComponentProps } from 'react';
import { reviewStore, readPrototype } from '@/mocks/prototype';
import '@weiran-tech/prototype/style.css';
export const authorsStore = createReviewAuthors({ getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value), removeItem: key => localStorage.removeItem(key), clear: () => localStorage.clear(), key: index => localStorage.key(index), get length() { return localStorage.length; } }, 'weiran_prototype_review_authors_v1', () => readPrototype().notes);
type Props = Omit<ComponentProps<typeof BaseReviewForm>, 'actions' | 'authorsStore'>;
export function ReviewForm(props: Props) { return <BaseReviewForm {...props} actions={reviewStore} authorsStore={authorsStore} />; }
