import { Button, Container, Title, Text, Stack, Box } from '@mantine/core';
import { useGameStore } from '../../stores/gameStore';

export function LandingPage() {
  const { setGameState } = useGameStore();

  const handleStart = () => {
    // Mulai game - ganti state dari loading/menu ke playing
    setGameState('playing');
  };

  return (
    <Box
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50, // Paling atas menutupi semuanya
        backgroundColor: '#000', // Hitam pekat atau ganti background image
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}
    >
      <Container size="sm" ta="center">
        <Stack gap="xl">
          <Box>
            <Title order={1} size="4rem" style={{ textShadow: '0 0 20px cyan' }}>
              NEUROVERSE
            </Title>
            <Text c="dimmed" size="lg">
              Explore your mind in 3D Real-time Environment
            </Text>
          </Box>

          <Button 
            size="xl" 
            variant="gradient" 
            gradient={{ from: 'blue', to: 'cyan' }}
            onClick={handleStart}
            styles={{ root: { boxShadow: '0 0 30px rgba(0, 255, 255, 0.4)' } }}
          >
            CONNECT TO NEUROSET
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}