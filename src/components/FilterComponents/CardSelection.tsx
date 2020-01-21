import React from "react";
import { connect } from "react-redux";
import Chip from "@material-ui/core/Chip";
import IconButton from "@material-ui/core/IconButton";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListSubheader from "@material-ui/core/ListSubheader";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import Tooltip from "@material-ui/core/Tooltip";

import AddIcon from "@material-ui/icons/Add";
import FilterListIcon from "@material-ui/icons/FilterList";
import { isBoolean } from "util";

import { addCardIdFilter, removeCardIdFilter, toggleCardIdFilter } from "~actions/filters";
import { AppWindow } from "~app";
import { getCardTypeImage } from "~pages/Cards/CardListItem";
import { getCardDescription } from "~functions/Utils";
import { cardsUpdate } from "~store/cards/thunks";
import { AppDispatch, ReduxState } from "~store/index";

const styles: any = {
    listItem: {
        display: "flex",
        flexWrap: "wrap",
        padding: "0 0 0 8px"
    },
    chip: {
        margin: 8
    },
    listItemIcon: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: 26,
        height: 50
    },
    listItemImg: {
        height: 40
    },
    chipImg: {
        height: 40
    },
    subheaderTitle: {
        height: 40
    }
};

interface IState {
    [key: string]: any;
}

interface IProps {
    t: AppWindow["t"];
}

class CardSelection extends React.Component<ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps> & IProps> {
    state: any;

    constructor(props, context) {
        super(props, context);
        this.state = {
            anchorEl: null
        };
    }

    componentDidMount() {
        if (this.props.cards.length === 0 && this.props.cardsLoading === false) {
            this.props.cardsUpdate(this.props.user.id);
        }
    }

    handleClick = event => {
        this.setState({ anchorEl: event.currentTarget });
    };
    handleClose = event => {
        this.setState({ anchorEl: null });
    };

    addCardId = cardId => event => {
        this.props.addCardIdFilter(cardId);
        if (this.props.cards.length === this.props.selectedCardIds.length + 1) {
            this.handleClose(event);
        }
    };
    removeCardId = cardId => event => {
        this.props.removeCardIdFilter(cardId);
    };

    render() {
        const { anchorEl } = this.state;
        const { t, cards, selectedCardIds, toggleCardIds } = this.props;

        const selectedCardChipItems = selectedCardIds.map((cardId, key) => {
            let card = cards.find(card => card.id === cardId);

            // ensure card exists
            if (!card) return null;
            card = card;
            const { cardImage, cardType } = getCardTypeImage(card);

            // display big chip or smaller icon
            return (
                <Chip
                    style={styles.chip}
                    onClick={this.removeCardId(card.id)}
                    label={card.second_line || cardType}
                    icon={<img style={styles.chipImg} src={cardImage} />}
                />
            );
        });

        const cardMenuItems = Object.keys(cards)
            // put inactive cards at the bottom
            .sort((index1, index2) => {
                const card1 = cards[index1];
                const card2 = cards[index2];

                if (card1.status !== "ACTIVE" && card2.status === "ACTIVE") return 1;
                if (card1.status === "ACTIVE" && card2.status !== "ACTIVE") return -1;

                return 0;
            })
            .map((cardIndex, key) => {
                const card = cards[cardIndex];

                // don't display already selected items
                if (selectedCardIds.includes(card.id)) {
                    return null;
                }

                const cardDescription = getCardDescription(card);
                const { cardImage, cardType } = getCardTypeImage(card);

                return (
                    <MenuItem key={key} onClick={this.addCardId(card.id)}>
                        <ListItemIcon style={styles.listItemIcon}>
                            <img style={styles.listItemImg} src={cardImage} />
                        </ListItemIcon>
                        {cardDescription || cardType}
                    </MenuItem>
                );
            });

        return (
            <>
                <ListSubheader style={styles.subheaderTitle}>
                    {t("Card filter")}

                    <ListItemSecondaryAction>
                        <Tooltip
                            placement="left"
                            title={t(`Click to ${toggleCardIds ? "include" : "exclude"} the selected cards`)}
                        >
                            <IconButton aria-haspopup="true" onClick={this.props.toggleCardIdFilter}>
                                {toggleCardIds ? <FilterListIcon className="icon-rotate-180" /> : <FilterListIcon />}
                            </IconButton>
                        </Tooltip>

                        <IconButton aria-haspopup="true" onClick={this.handleClick}>
                            <AddIcon />
                        </IconButton>
                    </ListItemSecondaryAction>
                    <Menu anchorEl={this.state.anchorEl} open={Boolean(anchorEl)} onClose={this.handleClose}>
                        {cardMenuItems}
                    </Menu>
                </ListSubheader>
                <ListItem style={styles.listItem}>{selectedCardChipItems}</ListItem>
            </>
        );
    }
}

const mapStateToProps = (state: ReduxState) => {
    return {
        user: state.user.user,

        cards: state.cards.cards,
        cardsLoading: state.cards.loading,

        selectedCardIds: state.cardIdFilter.selected_card_ids,
        toggleCardIds: state.cardIdFilter.toggle
    };
};

const mapDispatchToProps = (dispatch: AppDispatch) => {
    return {
        addCardIdFilter: cardId => dispatch(addCardIdFilter(cardId)),
        removeCardIdFilter: index => dispatch(removeCardIdFilter(index)),
        toggleCardIdFilter: () => dispatch(toggleCardIdFilter()),

        cardsUpdate: userId => dispatch(cardsUpdate(userId))
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(CardSelection);
