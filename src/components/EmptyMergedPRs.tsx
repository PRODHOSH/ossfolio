import { GitPullRequest } from 'lucide-react';

interface EmptyMergedPRsProps {
  username?: string;
}

export function EmptyMergedPRs({ username }: EmptyMergedPRsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 rounded-full bg-purple-50 dark:bg-purple-900/20 p-4">
        <GitPullRequest className="h-8 w-8 text-purple-400 dark:text-purple-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        No merged PRs yet
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
        {username
          ? `${username} hasn't had any PRs merged yet. Start contributing to open source to see your merged PRs here.`
          : 'No merged pull requests to display. Once you start contributing, your merged PRs will appear here.'}
      </p>
      <a
        href="https://github.com/explore"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
      >
        Explore open source projects →
      </a>
    </div>
  );
}
