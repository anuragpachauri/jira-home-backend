import React, { useEffect, useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { identityApiRef } from '@backstage/core-plugin-api';
import { Card, CardContent, Typography, Grid, Button, Avatar, Table, TableBody, TableCell, TableHead, TableRow } from '@material-ui/core';

// Define interfaces for typing
interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    priority: {
      name: string;
    };
    status: {
      name: string;
    };
    assignee: {
      displayName: string;
      avatarUrls: {
        "24x24": string;
      };
    } | null;
  };
}

interface JiraProjectData {
  self: string;
  avatarUrls: {
    "48x48": string;
  };
  name: string;
  key: string;
  lead: {
    displayName: string;
  };
  issues: JiraIssue[];
  assignedToMe: JiraIssue[];
}

// JiraDashboard component
export const JiraDashboard = () => {
  const identityApi = useApi(identityApiRef);
  const [projectData, setProjectData] = useState<JiraProjectData | null>(null);
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [incomingIssues, setIncomingIssues] = useState<JiraIssue[]>([]);
  const [assignedToMe, setAssignedToMe] = useState<JiraIssue[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        const { token } = await identityApi.getCredentials();
        const response = await fetch('http://localhost:7007/api/jira-home/project', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch project data: ${response.statusText}`);
        }

        const data: JiraProjectData = await response.json();

        // Filter out issues that are marked as 'Done'
        const openIssues = data.issues.filter(
          (issue) => issue.fields.status.name !== 'Done'
        );

        // Assign incoming issues and issues assigned to the user
        setProjectData(data);
        setIssues(openIssues);
        setIncomingIssues(openIssues); // Assuming open issues are considered as incoming issues
        setAssignedToMe(data.assignedToMe);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      }
    };

    fetchProjectData();
  }, [identityApi]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!projectData) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ border: '1px solid #333', borderRadius: '8px', padding: '16px', backgroundColor: '#2b2b2b', maxWidth: '1200px', margin: '0 auto' }}>
      <Typography variant="h4" style={{ textAlign: 'center', marginBottom: '16px', color: '#fff' }}>Jira Dashboard</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card style={{ height: '100%', minHeight: '300px', border: '1px solid #333', borderRadius: '8px', backgroundColor: '#424242', color: '#fff' }}>
            <CardContent style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Avatar src={projectData.avatarUrls["48x48"]} style={{ width: '56px', height: '56px' }} />
                <div style={{ marginLeft: '8px', flexGrow: 1 }}>
                  <Typography variant="h5">
                    {projectData.name} | <strong>{projectData.key}</strong>
                  </Typography>
                  <div style={{ borderBottom: '2px solid #fff', marginTop: '8px' }}></div>
                </div>
              </div>
              <Typography variant="body2" style={{ marginTop: '16px' }}>
                Project key: <strong>{projectData.key}</strong>
              </Typography>
              <Typography variant="body2">
                Project lead: <strong>{projectData.lead.displayName}</strong>
              </Typography>
              <Button
                variant="contained"
                color="primary"
                href={projectData.self}
                target="_blank"
                style={{ marginTop: '16px', alignSelf: 'flex-start', padding: '6px 12px' }}
              >
                Go to Project
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card style={{ height: '100%', minHeight: '300px', border: '1px solid #333', borderRadius: '8px', backgroundColor: '#424242', color: '#fff' }}>
            <CardContent style={{ height: '100%' }}>
              <Typography variant="h6">Open Issues ({issues.length})</Typography>
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <Table size="small" style={{ tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell style={{ width: '15%' }}>Key</TableCell>
                      <TableCell style={{ width: '15%' }}>Summary</TableCell>
                      <TableCell style={{ width: '15%' }}>Priority</TableCell>
                      <TableCell style={{ width: '15%' }}>Status</TableCell>
                      <TableCell style={{ width: '20%' }}>Assignee</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {issues.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell>{issue.key}</TableCell>
                        <TableCell style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.fields.summary}</TableCell>
                        <TableCell>{issue.fields.priority.name}</TableCell>
                        <TableCell>{issue.fields.status.name}</TableCell>
                        <TableCell>
                          {issue.fields.assignee ? (
                            <Grid container alignItems="center">
                              <Avatar src={issue.fields.assignee.avatarUrls["24x24"]} />
                              <Typography variant="body2" style={{ marginLeft: '4px' }}>
                                {issue.fields.assignee.displayName}
                              </Typography>
                            </Grid>
                          ) : (
                            'Unassigned'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card style={{ height: '100%', minHeight: '300px', border: '1px solid #333', borderRadius: '8px', backgroundColor: '#424242', color: '#fff' }}>
            <CardContent style={{ height: '100%' }}>
              <Typography variant="h6">Incoming Issues ({incomingIssues.length})</Typography>
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <Table size="small" style={{ tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell style={{ width: '15%' }}>Key</TableCell>
                      <TableCell style={{ width: '15%' }}>Summary</TableCell>
                      <TableCell style={{ width: '15%' }}>Priority</TableCell>
                      <TableCell style={{ width: '15%' }}>Status</TableCell>
                      <TableCell style={{ width: '20%' }}>Assignee</TableCell>
                    </TableRow>
                  </TableHead>
                  {/* <TableBody>
                    {incomingIssues.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell>{issue.key}</TableCell>
                        <TableCell style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.fields.summary}</TableCell>
                        <TableCell>{issue.fields.priority.name}</TableCell>
                        <TableCell>{issue.fields.status.name}</TableCell>
                        <TableCell>
                          {issue.fields.assignee ? (
                            <Grid container alignItems="center">
                              <Avatar src={issue.fields.assignee.avatarUrls["24x24"]} />
                              <Typography variant="body2" style={{ marginLeft: '4px' }}>
                                {issue.fields.assignee.displayName}
                              </Typography>
                            </Grid>
                          ) : (
                            'Unassigned'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody> */}
                </Table>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card style={{ height: '100%', minHeight: '300px', border: '1px solid #333', borderRadius: '8px', backgroundColor: '#424242', color: '#fff' }}>
            <CardContent style={{ height: '100%' }}>
              <Typography variant="h6">Assigned to Me ({assignedToMe.length})</Typography>
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <Table size="small" style={{ tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell style={{ width: '15%' }}>Key</TableCell>
                      <TableCell style={{ width: '15%' }}>Summary</TableCell>
                      <TableCell style={{ width: '15%' }}>Priority</TableCell>
                      <TableCell style={{ width: '15%' }}>Status</TableCell>
                      <TableCell style={{ width: '20%' }}>Assignee</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assignedToMe.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell>{issue.key}</TableCell>
                        <TableCell style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.fields.summary}</TableCell>
                        <TableCell>{issue.fields.priority.name}</TableCell>
                        <TableCell>{issue.fields.status.name}</TableCell>
                        <TableCell>
                          {issue.fields.assignee ? (
                            <Grid container alignItems="center">
                              <Avatar src={issue.fields.assignee.avatarUrls["24x24"]} />
                              <Typography variant="body2" style={{ marginLeft: '4px' }}>
                                {issue.fields.assignee.displayName}
                              </Typography>
                            </Grid>
                          ) : (
                            'Unassigned'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
};
