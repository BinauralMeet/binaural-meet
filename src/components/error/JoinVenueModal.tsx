import React from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, Button, IconButton } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
    dialog: {
        width: '33vw', // Increase this value for larger width
    },
    container: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        right: theme.spacing(1),
        top: theme.spacing(1),
        color: theme.palette.grey[500],
    },
    textField: {
        margin: theme.spacing(2),
    },
    submitButton: {
        margin: theme.spacing(2),
    }
}));

interface JoinVenueModalProps {
    open: boolean;
    onClose: () => void;
}

const JoinVenueModal: React.FC<JoinVenueModalProps> = ({ open, onClose }) => {
    const classes = useStyles();

    return (
      <Dialog open={open} onClose={onClose} aria-labelledby="form-dialog-title" classes={{paper: classes.dialog}} maxWidth='md' fullWidth>
            <DialogTitle id="form-dialog-title">
                Join Venue
                <IconButton aria-label="close" className={classes.closeButton} onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent className={classes.container}>
                <TextField
                    className={classes.textField}
                    autoFocus
                    margin="dense"
                    id="venueName"
                    label="Venue Name"
                    type="text"
                    fullWidth
                />
                <TextField
                    className={classes.textField}
                    margin="dense"
                    id="venuePassword"
                    label="Venue Password"
                    type="password"
                    fullWidth
                />
                <Button variant="contained" color="primary" className={classes.submitButton} onClick={() => onClose()}>
                    Join Room
                </Button>
            </DialogContent>
        </Dialog>
    );
};

export default JoinVenueModal;
