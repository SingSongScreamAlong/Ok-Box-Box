import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const LandingContainer = styled.div`
  min-height: 100vh;
  background: radial-gradient(circle at top right, #1a1f35 0%, #000000 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const NavBar = styled.nav`
  padding: 2rem 4rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
`;

const Logo = styled.h1`
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: 2px;
  background: linear-gradient(90deg, #00f2fe 0%, #4facfe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
`;

const NavLinks = styled.div`
  display: flex;
  gap: 2rem;
  align-items: center;
`;

const Button = styled(Link) <{ $primary?: boolean }>`
  text-decoration: none;
  padding: 0.8rem 1.5rem;
  border-radius: 4px;
  font-weight: 600;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;

  ${props => props.$primary ? `
    background: #fff;
    color: #000;
    &:hover {
      background: #e0e0e0;
      transform: translateY(-2px);
    }
  ` : `
    color: #fff;
    border: 1px solid rgba(255,255,255,0.2);
    &:hover {
      border-color: #fff;
    }
  `}
`;

const HeroSection = styled.section`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  position: relative;
  padding: 0 2rem;
`;

const Title = styled(motion.h1)`
  font-size: 5rem;
  font-weight: 900;
  margin-bottom: 1.5rem;
  line-height: 1.1;
  
  span {
    display: block;
    background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const Subtitle = styled(motion.p)`
  font-size: 1.25rem;
  color: #94a3b8;
  max-width: 600px;
  margin-bottom: 3rem;
  line-height: 1.6;
`;

const CTAButton = styled(motion(Link))`
  background: linear-gradient(90deg, #00f2fe 0%, #4facfe 100%);
  color: #fff;
  text-decoration: none;
  padding: 1.2rem 3rem;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  box-shadow: 0 10px 30px rgba(79, 172, 254, 0.4);
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 15px 40px rgba(79, 172, 254, 0.6);
  }
`;

const BackgroundCircle = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  z-index: 0;
  opacity: 0.4;
`;

const LandingPage = () => {
    return (
        <LandingContainer>
            <NavBar>
                <Logo>BLACKBOX</Logo>
                <NavLinks>
                    <Button to="/login">Log In</Button>
                    <Button to="/register" $primary>Sign Up</Button>
                </NavLinks>
            </NavBar>

            <HeroSection>
                <BackgroundCircle
                    style={{ width: '600px', height: '600px', background: '#4facfe', top: '-20%', right: '-10%' }}
                    animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                <BackgroundCircle
                    style={{ width: '500px', height: '500px', background: '#00f2fe', bottom: '-10%', left: '-10%' }}
                    animate={{ x: [0, -30, 0], y: [0, 50, 0] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                />

                <Title
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <span>MASTER YOUR</span>
                    <span>RACE CRAFT</span>
                </Title>

                <Subtitle
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    Advanced telemetry analysis and real-time coaching for the modern sim racer.
                    Uncover tenths of a second you didn't know you had.
                </Subtitle>

                <CTAButton
                    to="/register"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    Get Started
                </CTAButton>
            </HeroSection>
        </LandingContainer>
    );
};

export default LandingPage;
