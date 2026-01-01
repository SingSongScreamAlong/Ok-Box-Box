import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0a;
  color: #fff;
  padding: 2rem;
`;

const FormCard = styled(motion.div)`
  background: #151515;
  padding: 3rem;
  border-radius: 12px;
  width: 100%;
  max-width: 450px;
  border: 1px solid #333;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
`;

const Header = styled.div`
  margin-bottom: 2rem;
  text-align: center;

  h2 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: #fff;
  }

  p {
    color: #888;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  label {
    font-size: 0.9rem;
    font-weight: 500;
    color: #ccc;
  }

  input {
    padding: 0.8rem 1rem;
    border-radius: 6px;
    background: #222;
    border: 1px solid #333;
    color: #fff;
    font-size: 1rem;
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: #4facfe;
    }
  }
`;

const SubmitButton = styled(motion.button)`
  padding: 1rem;
  border-radius: 6px;
  border: none;
  background: linear-gradient(90deg, #00f2fe 0%, #4facfe 100%);
  color: #fff;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
`;

const ErrorMessage = styled.div`
  color: #ff4d4d;
  font-size: 0.9rem;
  text-align: center;
  padding: 0.5rem;
  background: rgba(255, 77, 77, 0.1);
  border-radius: 4px;
`;

const Footer = styled.p`
  margin-top: 2rem;
  text-align: center;
  color: #666;
  font-size: 0.9rem;

  a {
    color: #4facfe;
    text-decoration: none;
    font-weight: 500;
    &:hover { text-decoration: underline; }
  }
`;

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }

        setError('');
        setLoading(true);

        try {
            await register(email, name, password);
            // Registration logs user in automatically in our implementation
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageContainer>
            <FormCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Header>
                    <h2>Create Account</h2>
                    <p>Join the future of sim racing analytics</p>
                </Header>

                {error && <ErrorMessage>{error}</ErrorMessage>}

                <Form onSubmit={handleSubmit}>
                    <FormGroup>
                        <label>Full Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Jarno Opmeer"
                        />
                    </FormGroup>

                    <FormGroup>
                        <label>Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                        />
                    </FormGroup>

                    <FormGroup>
                        <label>Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </FormGroup>

                    <FormGroup>
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </FormGroup>

                    <SubmitButton
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={loading}
                    >
                        {loading ? 'Creating Account...' : 'Get Started'}
                    </SubmitButton>
                </Form>

                <Footer>
                    Already have an account? <Link to="/login">Sign in</Link>
                </Footer>
            </FormCard>
        </PageContainer>
    );
};

export default RegisterPage;
