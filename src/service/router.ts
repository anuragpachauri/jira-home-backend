import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import fetch from 'node-fetch';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config } = options;

  const router = Router();
  router.use(express.json());

  // Health check endpoint
  router.get('/health', (_, response) => {
    logger.info('Health check - PONG!');
    response.json({ status: 'ok' });
  });

  // Hardcoded project key
  const projectKey = config.getString('jira.projectKey');

  // Constant username to filter issues assigned to this user
  const assignedUsername = config.getString('jira.username');

  // Route to fetch Jira project details and issues using the hardcoded project key
  router.get('/project', async (req, res) => {
    logger.info(`Fetching Jira project details and issues for project key: ${projectKey}`);

    const jiraBaseUrl = config.getString('jira.baseUrl');
    const jiraToken = config.getString('jira.token');

    try {
      // Construct JQL query for all issues in the project
      const jqlQuery = `project = ${projectKey}`;

      // Fetch all issues in the project
      const issuesUrl = `${jiraBaseUrl}/search?jql=${encodeURIComponent(jqlQuery)}`;
      logger.info(`Jira API URL for issues: ${issuesUrl}`);

      const issuesResponse = await fetch(issuesUrl, {
        method: 'GET',
        headers: {
          Authorization: jiraToken,
          Accept: 'application/json',
        },
      });

      if (!issuesResponse.ok) {
        const text = await issuesResponse.text();
        logger.error(`Failed to fetch issues: ${issuesResponse.statusText}, Response: ${text}`);
        return res.status(issuesResponse.status).json({ error: issuesResponse.statusText });
      }

      const issuesData = await issuesResponse.json();
      const issues = issuesData.issues || [];

      // Filter issues assigned to the specific user by username only
      const assignedToMe = issues.filter((issue: any) => {
        const assignee = issue.fields.assignee;
        return assignee && assignee.displayName === assignedUsername;
      });

      // Fetch project details (optional, depending on your requirements)
      const projectUrl = `${jiraBaseUrl}/project/${projectKey}`;
      logger.info(`Jira API URL for project: ${projectUrl}`);

      const projectResponse = await fetch(projectUrl, {
        method: 'GET',
        headers: {
          Authorization: jiraToken,
          Accept: 'application/json',
        },
      });

      if (!projectResponse.ok) {
        const text = await projectResponse.text();
        logger.error(`Failed to fetch project: ${projectResponse.statusText}, Response: ${text}`);
        return res.status(projectResponse.status).json({ error: projectResponse.statusText });
      }

      const projectDetails = await projectResponse.json();

      // Combine project details with issues and assignedToMe
      const result = {
        ...projectDetails,
        issues,
        assignedToMe,
      };

      logger.info(`Successfully fetched project details and issues`);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error fetching project details or issues: ${error.message}`);
        return res.status(500).json({ error: error.message });
      } else {
        logger.error('An unknown error occurred');
        return res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  // Middleware for handling errors
  return router;
}
