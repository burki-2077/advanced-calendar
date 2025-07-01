import ForgeUI, { 
  Fragment,
  Text,
  Box,
  Stack,
  Button,
  Modal,
  ModalDialog,
  ModalBody,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  Heading,
  Badge,
  Card,
  Grid,
  Cell,
  Spinner,
  EmptyState,
  SectionMessage,
  useState,
  useEffect
} from '@forge/ui';

export const VacationCalendar = () => {
  const [vacationRequests, setVacationRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [error, setError] = useState(null);

  useEffect(async () => {
    try {
      setLoading(true);
      // Mock data for development - in real app this would come from backend
      const mockRequests = [
        {
          key: 'HR-123',
          fields: {
            summary: 'Annual Leave - John Doe',
            status: { name: 'Approved' },
            reporter: { displayName: 'John Doe' },
            created: '2024-01-15T09:00:00.000Z',
            updated: '2024-01-16T10:30:00.000Z',
            customfield_10178: { value: 'annual-leave' },
            customfield_10062: [{ displayName: 'Jane Manager' }],
            customfield_10015: '2024-02-01',
            customfield_10963: '2024-02-10',
            description: 'Planning a family vacation'
          }
        },
        {
          key: 'HR-124',
          fields: {
            summary: 'Sick Leave - Mary Smith',
            status: { name: 'Pending' },
            reporter: { displayName: 'Mary Smith' },
            created: '2024-01-20T14:00:00.000Z',
            updated: '2024-01-20T14:00:00.000Z',
            customfield_10178: { value: 'sick-leave' },
            customfield_10062: [{ displayName: 'Bob Manager' }],
            customfield_10015: '2024-01-25',
            customfield_10963: '2024-01-30',
            description: 'Medical appointment and recovery'
          }
        }
      ];
      
      setVacationRequests(mockRequests);
      setLeaveTypes([
        { value: 'annual-leave', label: 'Annual Leave' },
        { value: 'sick-leave', label: 'Sick Leave' },
        { value: 'personal-leave', label: 'Personal Leave' }
      ]);
    } catch (err) {
      setError('Failed to load vacation requests');
      console.error('Error loading vacation requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRequestClick = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleRefresh = () => {
    // In a real app, this would reload data from the backend
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getLeaveTypeDisplay = (value) => {
    const leaveType = leaveTypes.find(type => type.value === value);
    return leaveType ? leaveType.label : value || 'Not specified';
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'done':
        return 'green';
      case 'pending':
      case 'in progress':
        return 'yellow';
      case 'rejected':
      case 'declined':
        return 'red';
      default:
        return 'blue';
    }
  };

  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 'N/A';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <Box paddingSize="large">
        <Stack alignInline="center">
          <Spinner size="large" />
          <Text>Loading vacation calendar...</Text>
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box paddingSize="large">
        <SectionMessage appearance="error">
          <Text>{error}</Text>
        </SectionMessage>
      </Box>
    );
  }

  return (
    <Box paddingSize="large">
      <Stack space="large">
        {/* Header */}
        <Stack space="medium">
          <Heading level="h1">🏖️ Vacation Calendar</Heading>
          <Text appearance="subtle">
            Manage and view vacation requests for the HR team
          </Text>
        </Stack>

        {/* Vacation Requests Grid */}
        {vacationRequests.length === 0 ? (
          <EmptyState
            header="No vacation requests found"
            description="There are currently no vacation requests in the HR project."
            primaryAction={
              <Button 
                text="Refresh" 
                onClick={handleRefresh}
                appearance="primary"
              />
            }
          />
        ) : (
          <Grid columns={3} gap="medium">
            {vacationRequests.map((request) => (
              <Cell key={request.key}>
                <Card 
                  onClick={() => handleRequestClick(request)}
                  appearance="hoverable"
                >
                  <Stack space="medium">
                    {/* Request Header */}
                    <Stack space="small">
                      <Stack direction="horizontal" alignInline="space-between">
                        <Text weight="bold" size="medium">
                          {request.fields?.summary || request.key}
                        </Text>
                        <Badge 
                          text={request.fields?.status?.name || 'Unknown'}
                          appearance={getStatusColor(request.fields?.status?.name)}
                        />
                      </Stack>
                      <Text appearance="subtle" size="small">
                        {request.key}
                      </Text>
                    </Stack>

                    {/* Leave Type */}
                    <Stack space="xsmall">
                      <Text weight="medium" size="small">Leave Type:</Text>
                      <Text size="small">
                        {getLeaveTypeDisplay(request.fields?.customfield_10178?.value)}
                      </Text>
                    </Stack>

                    {/* Dates */}
                    <Stack space="xsmall">
                      <Text weight="medium" size="small">Duration:</Text>
                      <Text size="small">
                        {formatDate(request.fields?.customfield_10015)} - {formatDate(request.fields?.customfield_10963)}
                      </Text>
                      <Text appearance="subtle" size="small">
                        ({calculateDuration(request.fields?.customfield_10015, request.fields?.customfield_10963)})
                      </Text>
                    </Stack>

                    {/* Manager */}
                    {request.fields?.customfield_10062 && request.fields.customfield_10062.length > 0 && (
                      <Stack space="xsmall">
                        <Text weight="medium" size="small">Manager:</Text>
                        <Text size="small">
                          {request.fields.customfield_10062.map(manager => manager.displayName).join(', ')}
                        </Text>
                      </Stack>
                    )}

                    {/* Reporter */}
                    <Stack space="xsmall">
                      <Text weight="medium" size="small">Requested by:</Text>
                      <Text size="small">
                        {request.fields?.reporter?.displayName || 'Unknown'}
                      </Text>
                    </Stack>
                  </Stack>
                </Card>
              </Cell>
            ))}
          </Grid>
        )}

        {/* Detailed Modal */}
        {isModalOpen && selectedRequest && (
          <Modal onClose={() => setIsModalOpen(false)}>
            <ModalDialog width="large">
              <ModalHeader>
                <ModalTitle>Vacation Request Details</ModalTitle>
              </ModalHeader>
              <ModalBody>
                <Stack space="large">
                  {/* Request Summary */}
                  <Stack space="medium">
                    <Heading level="h3">📋 Request Information</Heading>
                    <Box backgroundColor="color.background.accent.gray.subtler" paddingSize="medium">
                      <Stack space="small">
                        <Text weight="bold" size="large">
                          {selectedRequest.fields?.summary || selectedRequest.key}
                        </Text>
                        <Stack direction="horizontal" alignInline="space-between">
                          <Text appearance="subtle">{selectedRequest.key}</Text>
                          <Badge 
                            text={selectedRequest.fields?.status?.name || 'Unknown'}
                            appearance={getStatusColor(selectedRequest.fields?.status?.name)}
                          />
                        </Stack>
                      </Stack>
                    </Box>
                  </Stack>

                  {/* Employee Info */}
                  <Stack space="medium">
                    <Heading level="h4">👤 Employee Information</Heading>
                    <Grid columns={2} gap="medium">
                      <Cell>
                        <Stack space="small">
                          <Text weight="medium">Requested by:</Text>
                          <Text>{selectedRequest.fields?.reporter?.displayName || 'Unknown'}</Text>
                        </Stack>
                      </Cell>
                      <Cell>
                        <Stack space="small">
                          <Text weight="medium">Manager(s):</Text>
                          <Text>
                            {selectedRequest.fields?.customfield_10062 && selectedRequest.fields.customfield_10062.length > 0
                              ? selectedRequest.fields.customfield_10062.map(manager => manager.displayName).join(', ')
                              : 'Not assigned'
                            }
                          </Text>
                        </Stack>
                      </Cell>
                    </Grid>
                  </Stack>

                  {/* Vacation Details */}
                  <Stack space="medium">
                    <Heading level="h4">🏖️ Vacation Details</Heading>
                    <Grid columns={2} gap="medium">
                      <Cell>
                        <Stack space="small">
                          <Text weight="medium">Leave Type:</Text>
                          <Badge 
                            text={getLeaveTypeDisplay(selectedRequest.fields?.customfield_10178?.value)}
                            appearance="neutral"
                          />
                        </Stack>
                      </Cell>
                      <Cell>
                        <Stack space="small">
                          <Text weight="medium">Duration:</Text>
                          <Text>
                            {calculateDuration(
                              selectedRequest.fields?.customfield_10015, 
                              selectedRequest.fields?.customfield_10963
                            )}
                          </Text>
                        </Stack>
                      </Cell>
                      <Cell>
                        <Stack space="small">
                          <Text weight="medium">Start Date:</Text>
                          <Text>{formatDate(selectedRequest.fields?.customfield_10015)}</Text>
                        </Stack>
                      </Cell>
                      <Cell>
                        <Stack space="small">
                          <Text weight="medium">End Date:</Text>
                          <Text>{formatDate(selectedRequest.fields?.customfield_10963)}</Text>
                        </Stack>
                      </Cell>
                    </Grid>
                  </Stack>

                  {/* Description */}
                  {selectedRequest.fields?.description && (
                    <Stack space="medium">
                      <Heading level="h4">📝 Description</Heading>
                      <Box backgroundColor="color.background.neutral.subtle" paddingSize="medium">
                        <Text>{selectedRequest.fields.description}</Text>
                      </Box>
                    </Stack>
                  )}

                  {/* Timestamps */}
                  <Stack space="medium">
                    <Heading level="h4">📅 Timeline</Heading>
                    <Grid columns={2} gap="medium">
                      <Cell>
                        <Stack space="small">
                          <Text weight="medium">Created:</Text>
                          <Text appearance="subtle">
                            {formatDate(selectedRequest.fields?.created)}
                          </Text>
                        </Stack>
                      </Cell>
                      <Cell>
                        <Stack space="small">
                          <Text weight="medium">Last Updated:</Text>
                          <Text appearance="subtle">
                            {formatDate(selectedRequest.fields?.updated)}
                          </Text>
                        </Stack>
                      </Cell>
                    </Grid>
                  </Stack>
                </Stack>
              </ModalBody>
              <ModalFooter>
                <Button 
                  text="Close" 
                  onClick={() => setIsModalOpen(false)}
                  appearance="primary"
                />
              </ModalFooter>
            </ModalDialog>
          </Modal>
        )}
      </Stack>
    </Box>
  );
}; 