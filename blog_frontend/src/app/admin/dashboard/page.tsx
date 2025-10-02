'use client';

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Form, Button } from 'react-bootstrap';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { api, authService } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorAlert from '../../components/ErrorAlert';

export default function AdminDashboard() {
  const [postStats, setPostStats] = useState([]);
  const [userStats, setUserStats] = useState([]);
  const [summary, setSummary] = useState({
    totalPosts: 0,
    totalUsers: 0,
    totalViews: 0,
    totalComments: 0,
  });
  const [timeRange, setTimeRange] = useState(30); // Default to 30 days
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated, user } = authService.useAuthState();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (user) {
      setIsAdmin(user.is_staff || user.is_superuser);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Redirect if not admin
  useEffect(() => {
    if (isAuthenticated === false || (isAuthenticated === true && !isAdmin)) {
      window.location.href = '/';
    }
  }, [isAuthenticated, isAdmin]);

  // Fetch analytics data
  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchAnalyticsData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [postResponse, userResponse, summaryResponse] = await Promise.all([
          api.get(`/analytics/posts/?days=${timeRange}`),
          api.get(`/analytics/users/?days=${timeRange}`),
          api.get('/analytics/summary/')
        ]);
        
        setPostStats(postResponse.data);
        setUserStats(userResponse.data);
        setSummary(summaryResponse.data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, [timeRange, isAdmin]);

  // Handle time range change
  const handleTimeRangeChange = (e) => {
    setTimeRange(parseInt(e.target.value, 10));
  };

  if (!isAdmin) {
    return <LoadingSpinner />;
  }

  return (
    <Container fluid className="py-4">
      <h1 className="mb-4">Admin Dashboard</h1>
      
      {error && <ErrorAlert message={error} />}
      
      {/* Time Range Selector */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Form.Group>
                <Form.Label>Time Range</Form.Label>
                <Form.Select 
                  value={timeRange}
                  onChange={handleTimeRangeChange}
                >
                  <option value={7}>Last 7 Days</option>
                  <option value={30}>Last 30 Days</option>
                  <option value={90}>Last 90 Days</option>
                  <option value={365}>Last Year</option>
                </Form.Select>
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Summary Cards */}
      <Row className="mb-4">
        <Col sm={6} md={3}>
          <Card className="mb-3 text-center">
            <Card.Body>
              <Card.Title className="text-primary">Total Posts</Card.Title>
              <Card.Text className="display-4">{loading ? '...' : summary.totalPosts}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        
        <Col sm={6} md={3}>
          <Card className="mb-3 text-center">
            <Card.Body>
              <Card.Title className="text-success">Total Users</Card.Title>
              <Card.Text className="display-4">{loading ? '...' : summary.totalUsers}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        
        <Col sm={6} md={3}>
          <Card className="mb-3 text-center">
            <Card.Body>
              <Card.Title className="text-info">Total Views</Card.Title>
              <Card.Text className="display-4">{loading ? '...' : summary.totalViews}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        
        <Col sm={6} md={3}>
          <Card className="mb-3 text-center">
            <Card.Body>
              <Card.Title className="text-warning">Total Comments</Card.Title>
              <Card.Text className="display-4">{loading ? '...' : summary.totalComments}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Charts */}
      <Row className="mb-4">
        <Col lg={6}>
          <Card className="mb-3">
            <Card.Header>Post Views Over Time</Card.Header>
            <Card.Body>
              {loading ? (
                <LoadingSpinner />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={postStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date"
                      tickFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="views_count" 
                      stroke="#8884d8" 
                      name="Views"
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={6}>
          <Card className="mb-3">
            <Card.Header>Active Users Over Time</Card.Header>
            <Card.Body>
              {loading ? (
                <LoadingSpinner />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={userStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date"
                      tickFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <Legend />
                    <Bar 
                      dataKey="active_users" 
                      fill="#82ca9d" 
                      name="Active Users"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Recent Data Tables */}
      <Row>
        <Col lg={6}>
          <Card className="mb-3">
            <Card.Header>Recent Posts</Card.Header>
            <Card.Body>
              <Table striped hover responsive>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Views</th>
                    <th>Published</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4}><LoadingSpinner /></td></tr>
                  ) : (
                    /* Populate with real data when API is ready */
                    <tr><td colSpan={4}>No data available</td></tr>
                  )}
                </tbody>
              </Table>
              <div className="text-center">
                <Button variant="outline-primary" size="sm">View All Posts</Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={6}>
          <Card className="mb-3">
            <Card.Header>Recent Users</Card.Header>
            <Card.Body>
              <Table striped hover responsive>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Posts</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4}><LoadingSpinner /></td></tr>
                  ) : (
                    /* Populate with real data when API is ready */
                    <tr><td colSpan={4}>No data available</td></tr>
                  )}
                </tbody>
              </Table>
              <div className="text-center">
                <Button variant="outline-primary" size="sm">View All Users</Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}