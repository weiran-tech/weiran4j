import { repository, versionReviews, versionDiscussions } from './project.mjs';
export function reviewReference(version) {
    const number = versionDiscussions[version] || versionReviews[version];
    const kind = versionDiscussions[version] ? 'discussion' : 'issue';
    return number ? { kind, number, label: kind === 'discussion' ? 'Discussion' : '历史 Issue', url: `https://github.com/${repository}/${kind === 'discussion' ? 'discussions' : 'issues'}/${number}` } : null;
}
