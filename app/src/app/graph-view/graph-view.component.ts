import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';
import { ActivatedRoute } from '@angular/router';
import {switchMap, map, flatMap, tap, startWith} from 'rxjs/operators';
import { Observable, Subject } from 'rxjs';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-graph-view',
  templateUrl: './graph-view.component.html',
  styleUrls: ['./graph-view.component.sass']
})
export class GraphViewComponent implements OnInit {

  searchField = new FormControl();
  nodes: any = [];
  searchFilteredNodes: Observable<any[]>;
  graphFocus =  new Subject<string>();

  links:any = [];

  allNodes: any[] = [];
  allLinks: any[] = [];

  articleTypes = {};
  linkTypes = {};

  linksCollapsed = true;

  showOptions = false;

  constructor(private data:DataService, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.searchFilteredNodes = this.searchField.valueChanges
      .pipe(
        startWith(''),
        map(value => typeof value === 'string' ? value : value.label),
        map(name => name ? this.nodes.filter(option => option.name.toLowerCase().indexOf(name.toLowerCase()) === 0).slice(0,20) : this.nodes.slice(0, 20))
      )
    this.route.params.pipe(
      tap(console.log),
      switchMap(x => this.data.getGraph(x?.world).pipe(tap(x => console.log(x)))),
    ).subscribe((x:any) => {
      console.log("Loaded", x);
      this.allNodes = x["nodes"]; 
      this.allLinks = x["links"];
      for(var node of this.allNodes){        
        if(!(node.group in this.articleTypes)){
          this.articleTypes[node.group] = "2";
        }
      }
      for(var link of this.allLinks){        
        if(!(link.group in this.linkTypes)){
          this.linkTypes[link.group] = "2";
        }
      }
      this.update();
    });
  }

  
  searchBarDisplay(node): string {
    return node && node.label ? node.label : '';
  }

  update(){
    console.log(this.articleTypes, this.linkTypes);
    this.nodes = this.allNodes.filter(x => this.articleTypes[x.group] > 0);
    this.links = this.collapseLinks(this.allLinks.filter(x => this.linkTypes[x.group] > 0 && !(this.articleTypes[x.source.group] == 0 || this.articleTypes[x.target.group] == 0)));
    console.log(this.links);
  }

  collapseLinks(linkList){
    console.log(linkList);
    if(!this.linksCollapsed)return linkList;
    var newLinks = {};
    for(let link of linkList){
      let id = [typeof(link.source) === "string"?link.source:link.source.id, typeof(link.target) === "string"?link.target:link.target.id].sort().join("-");
      if(newLinks[id]){
        newLinks[id].group = [newLinks[id].group, link.group].sort()[0];
        newLinks[id].label.add(link.label);
        newLinks[id].bidirectional = true;
      }else{
        newLinks[id] = link;
        newLinks[id].label = new Set([link.group]);
      }      
    }
    console.log(newLinks);
    return Object.values(newLinks);
  }

  keys(obj){
    return Object.keys(obj);
  }

  log(event){
    console.log(event);
  }
}
