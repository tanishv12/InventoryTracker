'use client'
import { useState, useEffect } from "react";
import { firestore } from '@/firebase';
import { Box, Modal, Stack, Button, TextField, Typography, Card, CardContent, CardActions, Grid } from "@mui/material";
import { collection, query, getDocs, setDoc, doc, deleteDoc, getDoc, updateDoc } from "firebase/firestore";

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const updateInventory = async () => {
    const snapshot = query(collection(firestore, 'inventory'));
    const docs = await getDocs(snapshot);
    const inventoryList = [];
    docs.forEach((doc) => {
      inventoryList.push({
        name: doc.id,
        ...doc.data(),
      });
    });
    setInventory(inventoryList);
  }

  const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const removeItem = async (item) => {
    const docRef = doc(collection(firestore, 'inventory'), item);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const { quantity } = docSnap.data();
      if (quantity === 1) {
        await deleteDoc(docRef);
      } else {
        await updateDoc(docRef, { quantity: quantity - 1 });
      }
    }
    await updateInventory();
  }

  const addItem = async (item) => {
    const capitalizedItem = capitalizeFirstLetter(item);
    const docRef = doc(collection(firestore, 'inventory'), capitalizedItem);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const { quantity } = docSnap.data();
      await updateDoc(docRef, { quantity: quantity + 1 });
    } else {
      await setDoc(docRef, { quantity: 1 });
    }
    await updateInventory();
  }

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  useEffect(() => {
    updateInventory();
  }, []);

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box width="100vw" height="100vh" display="flex" justifyContent="center" alignItems="center" flexDirection="column" gap={2}>
      <Modal open={open} onClose={handleClose}>
        <Box
          position="absolute"
          top="50%"
          left="50%"
          width={400}
          bgcolor="white"
          border="2px solid black"
          boxShadow={24}
          p={4}
          display="flex"
          flexDirection="column"
          gap={3}
          sx={{
            transform: "translate(-50%, -50%)",
            borderRadius: '16px',  // Rounded edges for the modal
          }}
        > 
          <Typography variant="h6">Add item</Typography>
          <Stack width="100%" direction="row" spacing={2}>
            <TextField
              variant='outlined'
              fullWidth
              value={itemName}
              onChange={(e) => {
                setItemName(e.target.value);
              }}
            />
            <Button
              variant="outlined"
              onClick={() => {
                addItem(itemName);
                setItemName('');
                handleClose();
              }}
            >
              Add
            </Button>
          </Stack>
        </Box>
      </Modal>
      <Box border="1px solid black" width="800px" sx={{ borderRadius: '16px' }}>
        <Box
          width="100%"
          height="100px"
          bgcolor="grey"
          display="flex"
          alignItems="center"
          justifyContent="center"
          sx={{ borderRadius: '16px 16px 0 0' }}
        >
          <Typography variant="h3">Inventory Items</Typography>
        </Box>
        <Box width="100%" height="550px" overflow="auto" padding={2}>
          <Grid container spacing={2}>
            {filteredInventory.map(({ name, quantity }) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={name}>
                <Card sx={{ borderRadius: '16px' }}>
                  <CardContent>
                    <Typography variant="h5" component="div">
                      {name.charAt(0).toUpperCase() + name.slice(1)}
                    </Typography>
                    <Typography variant="h6" color="text.secondary">
                      Quantity: {quantity}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button variant="contained" onClick={() => addItem(name)}>
                      Add
                    </Button>
                    <Button variant="contained" onClick={() => removeItem(name)}>
                      Remove
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
      <Box width="750px" height="250px" display="flex" justifyContent="space-between" alignItems="center" flexDirection="row">
        <TextField 
          variant='outlined'
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button variant="contained" onClick={handleOpen}>Add New Item</Button>
      </Box>
    </Box>
  );
}
