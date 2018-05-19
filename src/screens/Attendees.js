import React from 'react';
import {
  Animated,
  Platform,
  Text,
  StyleSheet,
  View,
  LayoutAnimation,
} from 'react-native';
import { View as AnimatableView } from 'react-native-animatable';
import { Searchbar } from 'react-native-paper';
import { withNavigation } from 'react-navigation';
import { Query } from 'react-apollo';

import NavigationBar from '../components/NavigationBar';
import MenuButton from '../components/MenuButton';
import ContactCard from '../components/ContactCard';
import AttendeesSearchResults from '../components/AttendeesSearchResults';

import { Colors, Layout } from '../constants';
import GET_ATTENDEES from '../data/attendeesquery';
import { getContactTwitter } from '../utils';

class Attendees extends React.Component {
  state = {
    scrollY: new Animated.Value(0),
    attendees: [],
    query: '',
  };

  throttleDelayMs = 200
  throttleTimeout = null
  queryThrottle = text => {
    clearTimeout(this.throttleTimeout);

    this.throttleTimeout = setTimeout(() => {
      LayoutAnimation.easeInEaseOut();
      this.setState({ query: text });
    }, this.throttleDelayMs);
  }

  render() {
    const { scrollY } = this.state;
    const headerOpacity = scrollY.interpolate({
      inputRange: [0, 150],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    return (
      <View style={{ flex: 1 }}>
        <Searchbar
          onChangeText={text => this.queryThrottle(text)}
          placeholder="Search for conference attendees"
          style={styles.textInput}
        />
        <View
          style={{
            backgroundColor: '#4d5fab',
            paddingTop: Layout.headerHeight,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        />
        <DeferredAttendeesContent query={this.state.query}/>
        <OverscrollView />

        <NavigationBar
          renderLeftButton={() => <MenuButton />}
          animatedBackgroundOpacity={headerOpacity}
        />
      </View>
    );
  }
}

@withNavigation
class DeferredAttendeesContent extends React.Component {
  state = {
    ready: Platform.OS === 'android' ? false : true,
  };

  componentDidMount() {
    if (this.state.ready) {
      return;
    }
    setTimeout(() => this.setState({ ready: true }), 200);
  }

  _renderItem = ({ item: attendee }) => (
    <ContactCard
      key={attendee.id}
      contact={attendee}
      tickets={this.state.tickets}
      onPress={this._handlePressRow}
    />
  );

  _handlePressRow = attendee => {
    this.props.navigation.navigate('AttendeeDetail', { attendee });
  };

  render() {
    if (!this.state.ready) {
      return null;
    }
    const { query } = this.props;
    const cleanedQuery = query.toLowerCase().trim();

    return (
      <AnimatableView animation="fadeIn" useNativeDriver duration={800}>
        <Query query={GET_ATTENDEES}>
          {({ loading, error, data }) => {
            if (error) {
              return <Text>Error ${error}</Text>;
            }
            const attendees = data && data.events && data.events[0] ? data.events[0].attendees : [];
            const filteredAttendees = [];
            const attendeesSearchRankingScore = {};
            attendees.forEach(attendee => {
              const fullName = `${attendee.firstName} ${attendee.lastName}`;
              const matchesName = fullName
                .toLowerCase()
                .trim()
                .includes(cleanedQuery);
              const matchesEmail = attendee.email
                .toLowerCase()
                .trim()
                .includes(cleanedQuery);
              const matchesTwitter = getContactTwitter(attendee)
                .toLowerCase()
                .trim()
                .includes(cleanedQuery);

              attendeesSearchRankingScore[`${attendee.id}`] = 0;
              if (matchesName || matchesEmail || matchesTwitter) {
                filteredAttendees.push(attendee);
              }
              if (matchesName) {
                attendeesSearchRankingScore[`${attendee.id}`] += 1;
              }
              if (matchesEmail) {
                attendeesSearchRankingScore[`${attendee.id}`] += 1;
              }
              if (matchesTwitter) {
                attendeesSearchRankingScore[`${attendee.id}`] += 1;
              }
            });
            const sortedFilteredAttendees = filteredAttendees.sort((attendee1, attendee2) => {
              return (
                attendeesSearchRankingScore[`${attendee2.id}`] -
                attendeesSearchRankingScore[`${attendee1.id}`]
              );
            });
            console.log('Attendees: ', sortedFilteredAttendees);

            return (
              <React.Fragment>
                <AttendeesSearchResults
                  attendees={sortedFilteredAttendees}
                  onPress={this._handlePressRow}
                  searchQuery={cleanedQuery}
                />
              </React.Fragment>
            );
          }}
        </Query>
      </AnimatableView>
    );
  }
}

const OverscrollView = () => (
  <View
    style={{
      position: 'absolute',
      top: -400,
      height: 400,
      left: 0,
      right: 0,
      backgroundColor: Colors.blue,
    }}
  />
);

const styles = StyleSheet.create({
  textInput: {
    height: 60,
    position: 'absolute',
    top: 70 + Layout.notchHeight,
    left: 0,
    right: 0,
    marginLeft: 6,
    marginRight: 6,
    zIndex: 10,
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 4,
    borderWidth: 0,
    borderColor: 'black',
  }
});

export default Attendees;
